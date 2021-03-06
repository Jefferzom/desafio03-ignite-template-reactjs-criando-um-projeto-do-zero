import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';

import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

function FormatPosts(posts: PostPagination): Post[] {
  const newPostsFormatted = posts.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        "dd MMM' 'yyyy",
        {
          locale: ptBR,
        }
      ),
      data: {
        title: post.data.title as string,
        subtitle: post.data.subtitle as string,
        author: post.data.author as string,
      },
    };
  });

  return newPostsFormatted;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { results, next_page } = postsPagination;

  const resultsWithDateFormated = results.map(result => ({
    ...result,
    first_publication_date: format(
      new Date(result.first_publication_date),
      "dd MMM' 'yyyy",
      {
        locale: ptBR,
      }
    ),
  }));

  const [posts, setPosts] = useState(resultsWithDateFormated);
  const [nextPage, setNextPage] = useState(next_page);

  async function getMorePosts(): Promise<void> {
    if (!next_page) {
      return;
    }

    const nextPosts = await fetch(next_page);

    const nextPostsJSON = await nextPosts.json();

    const newPostsFormatted = FormatPosts(nextPostsJSON);

    setPosts([...posts, { ...newPostsFormatted[0] }]);

    const nextPageCondition = nextPostsJSON.nextPage
      ? nextPostsJSON.nextPage
      : '';
    setNextPage(nextPageCondition);
  }

  return (
    <>
      <Head>
        <title>Space Traveling</title>
      </Head>
      <div className={commonStyles.container}>
        <div className={commonStyles.logo}>
          <img src="/images/logo.svg" alt="logo" />
        </div>
        {posts.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <div className={styles.post}>
              <h2>{post.data.title}</h2>
              <span>{post.data.subtitle}</span>
              <div className={commonStyles.info}>
                <p>
                  <FiCalendar /> {post.first_publication_date}
                </p>
                <p>
                  <FiUser /> {post.data.author}
                </p>
              </div>
            </div>
          </Link>
        ))}
        {nextPage && (
          <div className={styles.morePosts}>
            <button type="button" onClick={getMorePosts}>
              Carregar mais posts
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 10,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title as string,
        subtitle: post.data.subtitle as string,
        author: post.data.author as string,
      },
    };
  });

  const finalProps = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination: finalProps,
    },
    revalidate: 1800, // 30 minutos
  };
};
